using donation_MgmtSrv as service from '../../srv/service';

annotate service.Analytics with @UI.HeaderInfo: {
    TypeName        : 'AI Generated Insight',
    TypeNamePlural  : 'AI Generated Insights',
    Title           : { Value: 'AI Generated Insights' }
};


annotate service.Analytics with {
  @Core.Computed totalDonations;
  @Core.Computed totalAmount;
  @Core.Computed narrative;
};


annotate service.Analytics with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Insight Type',
            Value : insightType,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Period',
            Value : periodStart,
        },
        {
            $Type : 'UI.DataField',
            Label : 'To',
            Value : periodEnd,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Total Donations',
            Value : totalDonations,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Total Amount',
            Value : totalAmount,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Generated',
            Value : createdAt,
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Label  : 'Generate New Insight',
            // Bound action: donation_MgmtSrv.Analytics_generate
            Action : 'donation_MgmtSrv.Analytics_generate',
            Inline : true,
        },
    ],

    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Insight Type',
                Value : insightType,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Period Start',
                Value : periodStart,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Period End',
                Value : periodEnd,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Total Donations',
                Value : totalDonations,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Total Amount',
                Value : totalAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Narrative',
                Value : narrative,
                ![@UI.MultiLineText] : true,
            },
        ],
    },

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'GeneratedFacet1',
            Label  : 'Insight Details',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
);
