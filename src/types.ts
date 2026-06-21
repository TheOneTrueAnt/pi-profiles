export interface Profile {
  name: string;
  path: string; // absolute
}

export interface ProfileSummary {
  name: string;
  path: string; // absolute
  isDefault: boolean;
}

export interface CreateOpts {
  /** Share auth.json from stock pi config where supported. Default: true. */
  shareAuth?: boolean;
  /** Share models.json from stock pi config where supported. Default: true. */
  shareModels?: boolean;
  /** Name of an existing profile to copy from. */
  from?: string;
  /** Copy from the stock ~/.pi/agent/ directory. */
  fromBase?: boolean;
}
