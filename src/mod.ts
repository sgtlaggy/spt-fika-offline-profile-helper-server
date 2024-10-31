import { DependencyContainer } from "tsyringe";

import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import { ISptProfile } from "@spt/models/eft/profile/ISptProfile";
import { SaveServer } from "@spt/servers/SaveServer";
import { HttpResponseUtil } from "@spt/utils/HttpResponseUtil";


class Mod implements IPreSptLoadMod {
    public preSptLoad(container: DependencyContainer): void {
        const logger = container.resolve<ILogger>("WinstonLogger");
        const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");
        const httpResponseUtil = container.resolve<HttpResponseUtil>("HttpResponseUtil");
        const saveServer = container.resolve<SaveServer>("SaveServer");

        function log(message: string) {
            logger.warning(`[OfflineProfileHelper] ${message}`);
        }

        staticRouterModService.registerStaticRouter(
            "OfflineProfileHelperUpload",
            [{
                url: "/helper/profile/upload",
                action: async (_url, info: ISptProfile, _sessionID, _output) => {
                    let profileExists = false;
                    const iinfo = info.info;

                    for (const profile of Object.values(saveServer.getProfiles())) {
                        const pinfo = profile.info;

                        // ensure username isn't used by another profile
                        // primarily useful for importing profiles of new members
                        if (iinfo.username === pinfo.username && iinfo.id !== pinfo.id) {
                            log(`Profile ${info.info.id} attempt failed: duplicate username`);
                            return httpResponseUtil.noBody({
                                message: "Username already in use."
                            });
                        }

                        // "authentication"
                        if (iinfo.id === pinfo.id && (iinfo.username !== pinfo.username || iinfo.password !== pinfo.password)) {
                            log(`Profile ${iinfo.id} attempt failed: authentication.`);
                            return httpResponseUtil.noBody({
                                message: "Authentication failed."
                            });
                        }

                        if (iinfo.id === pinfo.id) {
                            profileExists = true;
                        }
                    }

                    saveServer.addProfile(info);
                    log(`Profile ${info.info.id} ${profileExists ? "updated" : "imported"}.`);
                    return httpResponseUtil.noBody({
                        message: null
                    });
                }
            }],
            ""
        );
    }
}

export const mod = new Mod();
