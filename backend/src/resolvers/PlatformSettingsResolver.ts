import { AuthenticatedContext } from "./../context";
import { PlatformSettingsInput } from "../generated/graphql";
import { PlatformSettingsEntity } from "../entity/PlatformSettingsEntity";
import { PlatformSettingsRepository } from "../repository/PlatformSettingsRepository";

export const savePlatformSettings = async (
    _0: any,
    { settings }: { settings: PlatformSettingsInput },
    context: AuthenticatedContext,
    info: any
) => {
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

export const getPlatformSettingsByKey = async (_0: any, {}, context: AuthenticatedContext, info: any) => {
    const repository = context.connection.getCustomRepository(PlatformSettingsRepository);
    return await repository.createQueryBuilder().getMany();
};

export const getPublicPlatformSettingsByKey = async (
    _0: any,
    { key }: { key: string },
    context: AuthenticatedContext,
    info: any
) => {
    const repository = context.connection.getCustomRepository(PlatformSettingsRepository);
    const settings = await repository.findPublicSettingsByKey(key);
    if (!settings) {
        throw new Error("Platform settings not found");
    }

    return settings;
};
