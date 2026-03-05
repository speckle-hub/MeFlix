"use client";

import { useEffect, useRef } from "react";
import { useRepoStore, CLOUDSTREAM_REPOS, CLOUDSTREAM_NSFW_REPOS, ANIYOMI_REPOS } from "@/store/repoStore";

const REPO_INIT_VERSION = 1;

export function RepoInitializer() {
    const addRepository = useRepoStore(state => state.addRepository);
    const isHydrated = useRepoStore(state => state.isHydrated);
    const refreshRepositories = useRepoStore(state => state.refreshRepositories);
    const initialized = useRef(false);

    useEffect(() => {
        if (!isHydrated || initialized.current) return;
        initialized.current = true;

        const init = async () => {
            const currentVersion = parseInt(localStorage.getItem('repo_init_version') || '0');
            console.log(`[REPO INIT] Current Version: ${currentVersion} | Target: ${REPO_INIT_VERSION}`);

            if (currentVersion < REPO_INIT_VERSION) {
                console.log("[REPO INIT] Initializing default repositories...");

                // Install CloudStream Repos
                for (const repo of CLOUDSTREAM_REPOS) {
                    await addRepository(repo.url, 'cloudstream', repo.isNSFW);
                }

                // Install CloudStream NSFW Repos
                for (const repo of CLOUDSTREAM_NSFW_REPOS) {
                    await addRepository(repo.url, 'cloudstream', true);
                }

                // Install Aniyomi Repos
                for (const repo of ANIYOMI_REPOS) {
                    await addRepository(repo.url, 'aniyomi', false);
                }

                // Trigger a full refresh to get extensions
                await refreshRepositories();

                localStorage.setItem('repo_init_version', String(REPO_INIT_VERSION));
                console.log("[REPO INIT] Initialization complete.");
            }
        };

        init();
    }, [isHydrated]);

    return null;
}
