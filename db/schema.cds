namespace Donation_Mgmt;
using { cuid } from '@sap/cds/common';

@assert.unique: { name: [name] }
entity Donors : cuid {
  name: String(100) @mandatory;
  email: String(100);
  phone: String(15);
  status: String(10);
  donorType: String(20);
  isRecurringDonor: Boolean;
  isHNI: Boolean;
  donations: Composition of many Donations on donations.donor = $self;
}

entity Donations : cuid {
  donorName: String(100);
  donorEmail: String(100);
  donorPhone: String(15);
  city: String(50);
  amount: Integer;
  currencyCode: String(3);
  donationDate: Date;
  cause: String(100);
  campaign: String(100);
  donor: Association to Donors;

  summary      : String(2000);

}

// Virtual entity for Analytics dashboard
entity Analytics {
  key ID          : String; // Always '1' - singleton
  narrative       : String(5000);
  totalDonations  : Integer;
  totalAmount     : Decimal(15, 2);
  lastUpdated     : DateTime;
}

