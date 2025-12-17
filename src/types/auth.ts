export interface ZoUser {
  id: string;
  pid: string;
  first_name: string;
  last_name: string;
  mobile_country_code?: string;
  mobile_number: string;
  email_address: string;
  membership: 'founder' | 'citizen' | 'none';
  roles?: string[];
  access_groups: string[];
  pfp_image?: string;
  bio?: string;
  place_name?: string;
  cultures?: Array<{
    key: string;
    name: string;
    icon: string;
  }>;
}

export interface ZoAuthSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  deviceId: string;
  deviceSecret: string;
  user: ZoUser;
}

export interface DeviceCredentials {
  deviceId: string;
  deviceSecret: string;
}

export interface OTPRequest {
  mobile_country_code: string;
  mobile_number: string;
  message_channel?: string;
}

export interface OTPVerifyRequest {
  mobile_country_code: string;
  mobile_number: string;
  otp: string;
}

export interface ZoLoginResponse {
  access_token: string;
  access_token_expiry: string;
  refresh_token: string;
  refresh_token_expiry: string;
  client_key: string;
  device_id: string;
  device_secret: string;
  user: ZoUser;
}

export interface ZoRefreshResponse {
  access: string;
  refresh: string;
  access_expiry: string;
  refresh_expiry: string;
}

