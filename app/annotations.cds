using { donation_MgmtSrv } from '../srv/service.cds';

annotate donation_MgmtSrv.Donors with @UI.HeaderInfo: { TypeName: 'Donor', TypeNamePlural: 'Donors', Title: { Value: name } };
annotate donation_MgmtSrv.Donors with {
  ID @UI.Hidden @Common.Text: { $value: name, ![@UI.TextArrangement]: #TextOnly }
};
annotate donation_MgmtSrv.Donors with @UI.Identification: [{ Value: name }];
annotate donation_MgmtSrv.Donors with {
  name @title: 'Name';
  email @title: 'Email';
  phone @title: 'Phone';
  status @title: 'Status';
  donorType @title: 'Donor Type';
  isRecurringDonor @title: 'Is Recurring Donor';
  isHNI @title: 'Is HNI'
};

annotate donation_MgmtSrv.Donors with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: name },
 { $Type: 'UI.DataField', Value: email },
 { $Type: 'UI.DataField', Value: phone },
 { $Type: 'UI.DataField', Value: status },
 { $Type: 'UI.DataField', Value: donorType },
 { $Type: 'UI.DataField', Value: isRecurringDonor },
 { $Type: 'UI.DataField', Value: isHNI }
];

annotate donation_MgmtSrv.Donors with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: name },
 { $Type: 'UI.DataField', Value: email },
 { $Type: 'UI.DataField', Value: phone },
 { $Type: 'UI.DataField', Value: status },
 { $Type: 'UI.DataField', Value: donorType },
 { $Type: 'UI.DataField', Value: isRecurringDonor },
 { $Type: 'UI.DataField', Value: isHNI }
  ]
};

annotate donation_MgmtSrv.Donors with {
  donations @Common.Label: 'Donations'
};

annotate donation_MgmtSrv.Donors with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' },
  { $Type : 'UI.ReferenceFacet', ID : 'Donations', Target : 'donations/@UI.LineItem' }
];

annotate donation_MgmtSrv.Donors with @UI.SelectionFields: [
  name
];

annotate donation_MgmtSrv.Donations with @UI.HeaderInfo: { TypeName: 'Donation', TypeNamePlural: 'Donations' };
annotate donation_MgmtSrv.Donations with {
  donor @Common.ValueList: {
    CollectionPath: 'Donors',
    Parameters    : [
      {
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: donor_ID, 
        ValueListProperty: 'ID'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'name'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'email'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'phone'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'status'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'donorType'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'isRecurringDonor'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'isHNI'
      },
    ],
  }
};
annotate donation_MgmtSrv.Donations with {
  donorName @title: 'Donor Name';
  donorEmail @title: 'Donor Email';
  donorPhone @title: 'Donor Phone';
  city @title: 'City';
  amount @title: 'Amount';
  currencyCode @title: 'Currency Code';
  donationDate @title: 'Donation Date';
  cause @title: 'Cause';
  campaign @title: 'Campaign'
};

annotate donation_MgmtSrv.Donations with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: donorName },
 { $Type: 'UI.DataField', Value: donorEmail },
 { $Type: 'UI.DataField', Value: donorPhone },
 { $Type: 'UI.DataField', Value: city },
 { $Type: 'UI.DataField', Value: amount },
 { $Type: 'UI.DataField', Value: currencyCode },
 { $Type: 'UI.DataField', Value: donationDate },
 { $Type: 'UI.DataField', Value: cause },
 { $Type: 'UI.DataField', Value: campaign }
];

annotate donation_MgmtSrv.Donations with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: donorName },
 { $Type: 'UI.DataField', Value: donorEmail },
 { $Type: 'UI.DataField', Value: donorPhone },
 { $Type: 'UI.DataField', Value: city },
 { $Type: 'UI.DataField', Value: amount },
 { $Type: 'UI.DataField', Value: currencyCode },
 { $Type: 'UI.DataField', Value: donationDate },
 { $Type: 'UI.DataField', Value: cause },
 { $Type: 'UI.DataField', Value: campaign }
  ]
};

annotate donation_MgmtSrv.Donations with {
  donor @Common.Text: { $value: donor.name, ![@UI.TextArrangement]: #TextOnly }
};

annotate donation_MgmtSrv.Donations with {
  donor @Common.Label: 'Donor'
};

annotate donation_MgmtSrv.Donations with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate donation_MgmtSrv.Donations with @UI.SelectionFields: [
  donor_ID
];

