import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import type { User } from "../types";

type AppAction = "manage" | "view" | "read" | "update" | "seed";
type AppSubject = "all" | "AdminPanel" | "Analytics" | "System" | "User";

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

export function defineAbilityFor(user: User | null): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (!user) {
    cannot("view", "AdminPanel");
    return build();
  }

  if (user.role === "admin") {
    can("manage", "all");
    can("view", "AdminPanel");
    can("read", "Analytics");
    can("read", "User");
    can("update", "User");
    can("seed", "System");
    return build();
  }

  cannot("view", "AdminPanel");
  return build();
}
