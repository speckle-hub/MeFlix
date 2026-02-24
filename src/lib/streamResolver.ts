import { fetchStreams } from "./stremioService";
import { useAddonStore } from "@/store/addonStore";
import { StremioStream } from "@/types/stremio";

export async function resolveStreams(type: string, id: string): Promise<StremioStream[]> {
    const { addons } = useAddonStore.getState();
    const enabledAddons = addons.filter(a => a.isEnabled);

    const allStreams: StremioStream[] = [];

    const promises = enabledAddons.map(addon =>
        fetchStreams(addon.url, type, id)
            .then(res => res.streams || [])
            .catch(e => {
                console.error(`Stream fetch failed for ${addon.name}:`, e);
                return [];
            })
    );

    const results = await Promise.all(promises);
    results.forEach(streams => allStreams.push(...streams));

    return allStreams;
}
