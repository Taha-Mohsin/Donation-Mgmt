sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'donationmgmt.donors',
            componentId: 'DonationsObjectPage',
            contextPath: '/Donors/donations'
        },
        CustomPageDefinitions
    );
});