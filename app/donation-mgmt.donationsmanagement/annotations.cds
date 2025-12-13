using donation_MgmtSrv as service from '../../srv/service';
using from '../annotations';

// Add side effects to refresh donor fields when donor is selected
annotate service.Donations with @(
    Common.SideEffects #DonorChanged : {
        SourceProperties : [donor_ID],
        TargetEntities : [donor]
    },
    UI.SelectionFields : [
        donor_ID,
        campaign,
        cause,
    ],
);

// Configure the donor association field with value help
annotate service.Donations with {
    donor @(
        Common.Label : 'Donor',
        Common.Text : donor.name,
        Common.TextArrangement : #TextFirst,
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Donors',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : donor_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'name',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'email',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'phone',
                }
            ],
        }
    )
};

// Make the stored fields readonly so users can't edit them directly
annotate service.Donations with {
    donorName @readonly;
    donorEmail @readonly;
    donorPhone @readonly;
};

// Main form layout - display donor info from association
annotate service.Donations with @(
    UI.FieldGroup #Main : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : donor_ID,
                Label : 'Donor',
            },
            {
                $Type : 'UI.DataField',
                Value : donor.email,
                Label : 'Donor Email',
            },
            {
                $Type : 'UI.DataField',
                Value : donor.phone,
                Label : 'Donor Phone',
            },
            {
                $Type : 'UI.DataField',
                Value : city,
            },
            {
                $Type : 'UI.DataField',
                Value : amount,
            },
            {
                $Type : 'UI.DataField',
                Value : currencyCode,
            },
            {
                $Type : 'UI.DataField',
                Value : donationDate,
            },
            {
                $Type : 'UI.DataField',
                Value : cause,
            },
            {
                $Type : 'UI.DataField',
                Value : campaign,
            },
        ],
    }
);

// Optional: List page columns
annotate service.Donations with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : donor.name,
            Label : 'Donor Name',
        },
        {
            $Type : 'UI.DataField',
            Value : amount,
        },
        {
            $Type : 'UI.DataField',
            Value : currencyCode,
        },
        {
            $Type : 'UI.DataField',
            Value : donationDate,
        },
        {
            $Type : 'UI.DataField',
            Value : cause,
        },
        {
            $Type : 'UI.DataField',
            Value : campaign,
        },
        {
            $Type : 'UI.DataField',
            Value : city,
        },
    ]
);