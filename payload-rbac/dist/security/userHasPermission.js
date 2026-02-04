export default async function userHasPermission({ req, principal, action }) {
    if (!req.user) {
        return false;
    }
    if (Number(req.user.id) === 1) {
        return true;
    }
    const principals = new Set((Array.isArray(principal) ? principal : [
        principal
    ]).filter(Boolean));
    if (principals.size === 0) {
        return false;
    }
    const userRoles = await req.payload.find({
        collection: "roles",
        where: {
            users: {
                contains: req.user.id
            }
        },
        req
    });
    for (const role of userRoles.docs){
        // @ts-ignore
        const permissions = role.permissions || {};
        for (const principalSlug of principals){
            const principalPermissions = permissions[principalSlug];
            if (principalPermissions?.[action] === true) {
                return true;
            }
        }
    }
    return false;
}

//# sourceMappingURL=userHasPermission.js.map