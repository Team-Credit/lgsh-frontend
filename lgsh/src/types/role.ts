export interface Role {
    roleId: string;
    roleNm: string;
    roleDesc?: string;
    roleLevel?: number;
    useYn: 'Y' | 'N';
    regUserId?: string;
    regDt?: string;
    updUserId?: string;
    updDt?: string;
}

export interface RoleListRequest {
    roleId?: string;
    roleNm?: string;
    useYn?: 'Y' | 'N';
}

export interface RoleMenu {
    menuId: string;
    menuNm: string;
    parentMenuId?: string;
    sortOrder?: number;
    menuLevel?: number;

    // Permissions
    canRead?: 'Y' | 'N';
    canWrite?: 'Y' | 'N';
    canDelete?: 'Y' | 'N';
    exportYn?: 'Y' | 'N';

    // Tree
    children?: RoleMenu[];
}
