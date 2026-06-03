import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { call_rpc } from "./logging";

export type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

// Builds the id → details map for every behaviour the device exposes (one
// list_all_behaviors plus a get_behavior_details per id). Shared by the
// keyboard editor's useBehaviors hook and the backup export/import, which all
// need the same registry.
export async function fetchBehaviorMap(
  conn: RpcConnection
): Promise<BehaviorMap> {
  const behavior_list = await call_rpc(conn, {
    behaviors: { listAllBehaviors: true },
  });

  const behavior_map: BehaviorMap = {};
  for (const behaviorId of behavior_list.behaviors?.listAllBehaviors
    ?.behaviors || []) {
    const behavior_details = await call_rpc(conn, {
      behaviors: { getBehaviorDetails: { behaviorId } },
    });
    const dets: GetBehaviorDetailsResponse | undefined =
      behavior_details?.behaviors?.getBehaviorDetails;

    if (dets) {
      behavior_map[dets.id] = dets;
    }
  }
  return behavior_map;
}
