sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"donationmgmt/donationsmanagement/test/integration/pages/DonationsList",
	"donationmgmt/donationsmanagement/test/integration/pages/DonationsObjectPage"
], function (JourneyRunner, DonationsList, DonationsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('donationmgmt/donationsmanagement') + '/test/flpSandbox.html#donationmgmtdonationsmanagemen-tile',
        pages: {
			onTheDonationsList: DonationsList,
			onTheDonationsObjectPage: DonationsObjectPage
        },
        async: true
    });

    return runner;
});

