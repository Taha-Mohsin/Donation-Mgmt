namespace Donation_Mgmt;
using { cuid, managed } from '@sap/cds/common';

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
// NOW A PERSISTENT ENTITY - can store multiple insights over time
entity Analytics : cuid, managed {
  narrative       : String(5000);
  totalDonations  : Integer;
  totalAmount     : Decimal(15, 2);
  periodStart     : Date;  // NEW: track what period this insight covers
  periodEnd       : Date;  // NEW: track what period this insight covers
  insightType     : String(50) default '12-Month Analysis';  // NEW: type of analysis
}

