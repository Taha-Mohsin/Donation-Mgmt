using { Donation_Mgmt as my } from '../db/schema.cds';

@path: '/service/donation_Mgmt'
@requires: 'authenticated-user'
service donation_MgmtSrv {
  entity Donors as projection on my.Donors;
  
  @odata.draft.enabled
  entity Donations as projection on my.Donations actions {
    // Bound action - works in both draft and active instances
    @(
      Common.SideEffects: {
        TargetProperties: ['summary']
      }
    )
    action generateThankYouMessage() returns { message: String; };
  };
}