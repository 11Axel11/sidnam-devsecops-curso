export interface CreateEDUS {
    password: string;
}

export interface EDUS {
    id_password: number;
    password: string;
}

export interface UpdateEDUS {
    id: number;
    newPassword: string;
}