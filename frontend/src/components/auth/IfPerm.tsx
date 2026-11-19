
import { useAuthz } from "@/hooks/useAuth";
import * as React from "react";

type Props = {
    perm?: string;
    allOf?: string[];
    anyOf?: string[];
    children: React.ReactNode;
};

export default function IfPerm({ perm, allOf, anyOf, children }:
    Props
) {
    const { can, canAny } = useAuthz({ ignoreWildcard: true, normalize: true });
    const allowed =
        perm ? can(perm) :
            allOf ? allOf.every(can) :
                anyOf ? canAny(anyOf) :
                    true;

    if (!allowed) return null;
    return <>{children}</>;
}