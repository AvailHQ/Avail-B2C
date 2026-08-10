export interface UserInfo {
  _id: string;
  name: string;
  email: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  queuePosition: number;
}

