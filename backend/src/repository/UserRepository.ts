import querystring from "querystring";

import { EntityRepository, Repository, EntityManager, SelectQueryBuilder } from "typeorm";
import sgMail from "@sendgrid/mail";
import { MailDataRequired } from "@sendgrid/helpers/classes/mail";
import { v4 as uuid } from "uuid";

import { User } from "../entity/User";
import { CreateUserInputAdmin, Permission, UpdateUserInput, CreateUserInput } from "../generated/graphql";
import { mixpanel } from "../util/mixpanel";
import { UserCatalogPermission } from "../entity/UserCatalogPermission";
import { CatalogRepository } from "./CatalogRepository";
import { hashPassword } from "../util/PasswordUtil";
import { Catalog } from "../entity/Catalog";

// https://stackoverflow.com/a/52097700
export function isDefined<T>(value: T | undefined | null): value is T {
	return <T>value !== undefined && <T>value !== null;
}

export interface UserCatalogInput {
	catalogId: number;
	permission: Permission[];
}

const SELECTED_WORKPAD_REGEX = /^selected_workpad_id_person_(\d+)$/;

declare module "typeorm" {
	interface SelectQueryBuilder<Entity> {
		filterUserCatalog(topLevelAlias: string, catalogId: number): SelectQueryBuilder<Entity>;
	}
}

SelectQueryBuilder.prototype.filterUserCatalog = function (topLevelAlias: string, catalogId: number) {
	return this.innerJoin(`${topLevelAlias}.userCatalogs`, "uo", "uo.catalogId = :catalogId", {
		catalogId
	});
};

async function getUser({
	username,
	manager,
	relations = [],
	includeInactive = false
}: {
	username: string;
	catalogId?: number;
	manager: EntityManager;
	relations?: string[];
	includeInactive?: boolean;
}): Promise<User | null> {
	const ALIAS = "users";
	let query = manager
		.getRepository(User)
		.createQueryBuilder(ALIAS)
		.where(includeInactive ? { username: username } : { isActive: true, username: username })
		.addRelations(ALIAS, relations);

	const val = await query.getOne();

	return val || null;
}

async function getUserByUserName({
	username,
	manager,
	relations = []
}: {
	username: string;
	manager: EntityManager;
	relations?: string[];
}): Promise<User | null> {
	const ALIAS = "users";
	let query = manager
		.getRepository(User)
		.createQueryBuilder(ALIAS)
		.where({ username: username })
		.addRelations(ALIAS, relations);

	const val = await query.getOne();

	return val || null;
}

async function getUserOrFail({
	username,
	manager,
	relations = [],
	includeInactive = false
}: {
	username: string;
	manager: EntityManager;
	relations?: string[];
	includeInactive?: boolean;
}): Promise<User> {
	const user = await getUser({
		username,
		manager,
		relations,
		includeInactive
	});
	if (!user) throw new Error(`Failed to get user ${username}`);
	return user;
}

async function getUserByUsernameOrFail({
	username,
	manager,
	relations = []
}: {
	username: string;
	manager: EntityManager;
	relations?: string[];
}): Promise<User> {
	const user = await getUserByUserName({
		username,
		manager,
		relations
	});
	if (!user) throw new Error(`Failed to get user ${username}`);
	return user;
}

function getUserProfilePicture(userId: number) {
	return `user/${userId}/icon/${uuid()}`; // each profile picture needs its unique path to "invalidate" browser cache
}

function getCatalogPicture(catalogId: number) {
	return `catalog/${catalogId}/icon/${uuid()}`; // each profile picture needs its unique path to "invalidate" browser cache
}

async function sendInviteEmail(user: User, senderName: string, signUp: boolean = true) {
	const params = {
		client_id: process.env.AUTH0_CLIENT_ID,
		response_type: "code",
		redirect_uri: process.env.DEFAULT_INVITATION_REDIRECT_URL,
		initial_screen: signUp ? "signUp" : "logIn",
		login_hint: user.emailAddress,
		initial_first_name: user.firstName,
		initial_last_name: user.lastName
	};

	const link = `${process.env.JWT_ISSUER}authorize?${querystring.stringify(params)}`;

	const msg: MailDataRequired = {
		to: {
			name: user.name,
			email: user.emailAddress
		},
		from: {
			name: "Data Beam",
			email: "hello@datapm.com"
		},
		dynamicTemplateData: {
			link,
			receiverName: user.firstName,
			senderName: senderName
		},
		// template lives within SendGrid configuration
		// https://mc.sendgrid.com/dynamic-templates/
		templateId: "d-af5fb8ecd1394375a971acb3e997cf6a"
	};

	try {
		await sgMail.send(msg);
	} catch (err) {
		console.error(`Failed to send email - ${err.message}`);
		throw new Error("Failed to send invitation email");
	}
}

function addUserToMixpanel(user: User, invitedByUserEmail: string) {
	mixpanel?.people.set(user.emailAddress, {
		$first_name: user.firstName,
		$last_name: user.firstName,
		$email: user.emailAddress,
		$created: user.createdAt.toISOString(),
		roles: user.catalogPermissions.flatMap((c) => c.permissions) ?? "['None']",
		invited_by_user: invitedByUserEmail
	});
}

@EntityRepository(User)
export class UserRepository extends Repository<User> {
	constructor() {
		super();
		sgMail.setApiKey(process.env.SENDGRID_API_KEY || "SG.DUMMY");
	}

	getUserByUsername(username: string) {
		const ALIAS = "getUsername";

		const user = this.createQueryBuilder(ALIAS).where([{ username }]).getOne();

		return user;
	}

	getUserByEmail(emailAddress: string) {
		const ALIAS = "getByEmailAddress";

		const user = this.createQueryBuilder(ALIAS).where([{ emailAddress }]).getOne();

		return user;
	}

	getUserByLogin(username: string, relations: string[] = []) {
		const ALIAS = "getByLogin";

		const user = this.createQueryBuilder(ALIAS)
			.where([{ username }, { emailAddress: username }])
			.addRelations(ALIAS, relations)
			.getOne();

		return user;
	}

	findMe({ id, relations = [] }: { id: number; relations?: string[] }) {
		return this.findOneOrFail({
			where: { id: id, isActive: true },
			relations: relations
		});
	}

	async findUser({
		username,
		relations = [],
		includeInactive = false
	}: {
		username: string;
		catalogId?: number;
		relations?: string[];
		includeInactive?: boolean;
	}) {
		return getUserOrFail({
			username: username,
			manager: this.manager,
			relations,
			includeInactive
		});
	}

	findUserByUserName({ username, relations = [] }: { username: string; relations?: string[] }) {
		return getUserByUsernameOrFail({
			username: username,
			manager: this.manager,
			relations
		});
	}

	findUsers({ relations = [] }: { relations?: string[] }) {
		const ALIAS = "users";
		return this.manager
			.getRepository(User)
			.createQueryBuilder(ALIAS)
			.where({ isActive: true })
			.addRelations(ALIAS, relations)
			.getMany();
	}

	/**
	 * Find all users across all catalogs and irrespective of whether
	 * they are active or archived
	 * @param relations joins to follow
	 */
	findAllUsers(relations: string[] = []) {
		const ALIAS = "users";
		return this.manager.getRepository(User).createQueryBuilder(ALIAS).addRelations(ALIAS, relations).getMany();
	}

	createUser({ value, relations = [] }: { value: CreateUserInput; relations?: string[] }): Promise<User> {
		return this.manager.nestedTransaction(async (transaction) => {
			const isAdmin = (input: CreateUserInput | CreateUserInputAdmin): input is CreateUserInputAdmin => {
				return (input as CreateUserInputAdmin) !== undefined;
			};

			// user does not exist, create it

			let user = transaction.create(User);

			if (value.firstName != null) user.firstName = value.firstName.trim();

			if (value.lastName != null) user.lastName = value.lastName.trim();

			user.emailAddress = value.emailAddress.trim();
			user.username = value.username.trim();
			user.passwordSalt = uuid();
			user.passwordHash = hashPassword(value.password, user.passwordSalt);

			const now = new Date();
			user.createdAt = now;
			user.updatedAt = now;

			user.isActive = true;

			if (isAdmin(value) && value.isAdmin) {
				user.isAdmin = value.isAdmin;
			} else {
				user.isAdmin = false;
			}

			user = await transaction.save(user);

			const catalog = await transaction.getCustomRepository(CatalogRepository).createCatalog({
				username: user.username,
				value: {
					description: "",
					isPublic: false,
					displayName: user.username,
					slug: user.username,
					website: user.website
				}
			});

			// send email
			// await sendInviteEmail(user, firstName + " " + lastName);

			// addUserToMixpanel(user, userEmail);

			return getUserOrFail({
				username: value.username,
				manager: transaction,
				relations,
				includeInactive: isAdmin(value)
			});
		});
	}

	updateUser({
		username,
		value,
		relations = []
	}: {
		username: string;
		value: UpdateUserInput;
		relations?: string[];
	}): Promise<User> {
		return this.manager.nestedTransaction(async (transaction) => {
			const dbUser = await getUserByUsernameOrFail({
				username,
				manager: transaction,
				relations: [...relations]
			});

			if (value.firstName) {
				dbUser.firstName = value.firstName.trim();
			}

			if (value.lastName) {
				dbUser.lastName = value.lastName.trim();
			}

			const finalUserName = value.username;
			if (value.username) {
				dbUser.username = value.username.trim();
			}

			if (value.email) {
				dbUser.emailAddress = value.email.trim();
			}

			if (value.password) {
				dbUser.passwordHash = hashPassword(value.password, dbUser.passwordSalt);
			}

			if (value.nameIsPublic != null) {
				dbUser.nameIsPublic = value.nameIsPublic;
			}

			dbUser.updatedAt = new Date();
			await transaction.save(dbUser);

			// return result with requested relations
			return getUserByUsernameOrFail({
				username: dbUser.username,
				manager: transaction,
				relations
			});
		});
	}

	markUserActiveStatus({
		username,
		active,
		relations = []
	}: {
		username: string;
		active: boolean;
		relations?: string[];
	}): Promise<User> {
		return this.manager.nestedTransaction(async (transaction) => {
			const user = await getUserByUsernameOrFail({
				username: username,
				manager: this.manager
			});

			// disable the user's catalog
			transaction.getCustomRepository(CatalogRepository).disableCatalog({ slug: user.username });

			user.isActive = active;

			if (!active) {
				user.username = user.username + "-DISABLED-" + new Date().getTime();
				user.emailAddress = user.emailAddress + "-DISABLED-" + new Date().getTime();
			}

			await transaction.save(user);

			return user;
		});
	}

	deleteUser({ username, relations = [] }: { username: string; relations?: string[] }): Promise<User> {
		const user = getUserByUsernameOrFail({
			username: username,
			manager: this.manager,
			relations
		});

		return this.manager.nestedTransaction(async (transaction) => {
			await transaction.delete(User, { username: (await user).username });
			return user;
		});
	}

	removeUserFromCatalog({
		username,
		catalog,
		relations = []
	}: {
		username: string;
		catalog: Catalog;
		relations?: string[];
	}): Promise<User> {
		return this.manager.nestedTransaction(async (transaction) => {
			const user = await getUserByUsernameOrFail({
				username: username,
				manager: transaction
			});

			// remove user from catalog, remove all user settings
			await transaction.delete(UserCatalogPermission, { userId: user.id, catalogId: catalog.id });

			user.updatedAt = new Date();
			await transaction.save(user);

			// return result with requested relations
			return getUserByUsernameOrFail({
				username: username,
				manager: transaction,
				relations
			});
		});
	}
}
