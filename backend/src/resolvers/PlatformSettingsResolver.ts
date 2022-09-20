import { AuthenticatedContext } from "./../context";
import { PlatformSettingsInput } from "../generated/graphql";
import { PlatformSettingsEntity } from "../entity/PlatformSettingsEntity";
import { PlatformSettingsRepository } from "../repository/PlatformSettingsRepository";

export const savePlatformSettings = async (
    _0: unknown,
    { settings }: { settings: PlatformSettingsInput },
    context: AuthenticatedContext
): Promise<PlatformSettingsEntity> => {
    const repository = context.connection.getCustomRepository(PlatformSettingsRepository);
    const settingsToSave = new PlatformSettingsEntity();

    const existingSettings = await repository.findSettingsByKey(settings.key);
    if (existingSettings) {
        settingsToSave.id = existingSettings.id;
    }

    settingsToSave.key = settings.key;
    settingsToSave.serializedSettings = settings.serializedSettings;
    settingsToSave.isPublic = settings.isPublic;

    return await repository.save(settingsToSave);
};

export const getPlatformSettingsByKey = async (
    _0: unknown,
    _1: unknown,
    context: AuthenticatedContext
): Promise<PlatformSettingsEntity[]> => {
    const repository = context.connection.getCustomRepository(PlatformSettingsRepository);
    return await repository.createQueryBuilder().getMany();
};

export const getPublicPlatformSettingsByKeyOrFail = async (
    _0: unknown,
    { key }: { key: string },
    context: AuthenticatedContext
): Promise<PlatformSettingsEntity> => {
    const repository = context.connection.getCustomRepository(PlatformSettingsRepository);
    const settings = await repository.findPublicSettingsByKey(key);
    if (!settings) {
        throw new Error("PLATFORM_SETTINGS_NOT_FOUND");
    }

    return settings;
};

export const getDeserializedPublicPlatformSettingsByKey = async (
    _0: unknown,
    { key }: { key: string },
    context: AuthenticatedContext
): Promise<Record<string, unknown> | null> => {
    const repository = context.connection.getCustomRepository(PlatformSettingsRepository);
    const entity = await repository.findPublicSettingsByKey(key);
    if (!entity) {
        return null;
    }

    return JSON.parse(entity.serializedSettings);
};
