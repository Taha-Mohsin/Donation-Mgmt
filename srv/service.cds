using { Donation_Mgmt as my } from '../db/schema.cds';

@path: '/service/donation_Mgmt'
@requires: 'authenticated-user'
service donation_MgmtSrv {
  entity Donors as projection on my.Donors;
  
  @odata.draft.enabled
  entity Donations as projection on my.Donations actions {
    @(
      Common.SideEffects: {
        TargetProperties: ['summary']
      }
    )
    action generateThankYouMessage() returns { message: String; };
  };

  // NOW WITH DRAFT AND CREATE ENABLED
  @odata.draft.enabled
  entity Analytics as projection on my.Analytics actions {
    // Action to generate and save a new insight
    action generate() returns Analytics;
  };
}