export interface ImgurPreviewSettings {
    defaultMaxWidth: number;
    defaultMaxHeight: number;
    enableCustomMode: boolean;
    rememberLastSize: boolean;
}

export const DEFAULT_SETTINGS: ImgurPreviewSettings = {
    defaultMaxWidth: 300,
    defaultMaxHeight: 300,
    enableCustomMode: false,
    rememberLastSize: false
}
