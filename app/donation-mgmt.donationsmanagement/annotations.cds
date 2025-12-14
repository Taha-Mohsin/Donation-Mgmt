using donation_MgmtSrv as service from '../../srv/service';
using from '../annotations';

// --- Side effects: when donor changes, refresh donor association ---
annotate service.Donations with @(
    Common.SideEffects #DonorChanged : {
        SourceProperties : [ donor_ID ],
        TargetEntities   : [ donor ]
    },
    UI.SelectionFields : [
        donor_ID,
        campaign,
        cause
    ]
);

// --- Donor association: value help & display text ---
annotate service.Donations with {
    donor @(
        Common.Label          : 'Donor',
        Common.Text           : donor.name,
        Common.TextArrangement: #TextFirst,
        Common.ValueList      : {
            $Type         : 'Common.ValueListType',
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
                }
            ]
        }
    )
};

// --- Make stored donor snapshot + summary read-only ---
annotate service.Donations with {
    donorName  @readonly;
    donorEmail @readonly;
    donorPhone @readonly;
    summary    @readonly @UI.MultiLineText;
};

// --- Main form layout (General Information) ---
annotate service.Donations with @(
    UI.FieldGroup #Main : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            {
                $Type : 'UI.DataField',
                Value : donor_ID,
                Label : 'Donor'
            },
            {
                $Type : 'UI.DataField',
                Value : donor.email,
                Label : 'Donor Email'
            },
            {
                $Type : 'UI.DataField',
                Value : donor.phone,
                Label : 'Donor Phone'
            },
            {
                $Type : 'UI.DataField',
                Value : city
            },
            {
                $Type : 'UI.DataField',
                Value : amount
            },
            {
                $Type : 'UI.DataField',
                Value : currencyCode
            },
            {
                $Type : 'UI.DataField',
                Value : donationDate
            },
            {
                $Type : 'UI.DataField',
                Value : cause
            },
            {
                $Type : 'UI.DataField',
                Value : campaign
            }
        ]
    }
);

// --- AI Summary section ---
annotate service.Donations with @(
    UI.FieldGroup #AISummary : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            {
                $Type : 'UI.DataField',
                Value : summary,
                Label : 'AI Summary'
            }
        ]
    }
);

// --- Action for AI Summary section ---
annotate service.Donations with @(
    UI.FieldGroup #AISummaryActions : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            {
                $Type       : 'UI.DataFieldForAction',
                Action      : 'donation_MgmtSrv.generateThankYouMessage',
                Label       : 'Generate',
                Emphasized  : true,
                ![@UI.Hidden] : false
            }
        ]
    }
);

// --- Facets: show General Information + AI Summary as separate sections ---
annotate service.Donations with @(
    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'GeneralInformation',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#Main'
        },
        {
            $Type   : 'UI.CollectionFacet',
            ID      : 'AISummaryFacet',
            Label   : 'Thank You Message',
            Facets  : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    ID     : 'AISummaryActions',
                    Target : '@UI.FieldGroup#AISummaryActions'
                },
                {
                    $Type  : 'UI.ReferenceFacet',
                    ID     : 'AISummaryContent',
                    Target : '@UI.FieldGroup#AISummary'
                }
            ]
        }
    ]
);

// --- List report columns ---
annotate service.Donations with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : donor.name,
            Label : 'Donor Name'
        },
        {
            $Type : 'UI.DataField',
            Value : amount
        },
        {
            $Type : 'UI.DataField',
            Value : currencyCode
        },
        {
            $Type : 'UI.DataField',
            Value : donationDate
        },
        {
            $Type : 'UI.DataField',
            Value : cause
        },
        {
            $Type : 'UI.DataField',
            Value : campaign
        },
        {
            $Type : 'UI.DataField',
            Value : city
        }
    ]
);