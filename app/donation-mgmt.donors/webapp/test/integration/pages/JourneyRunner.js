sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"donationmgmt/donors/test/integration/pages/DonorsList",
	"donationmgmt/donors/test/integration/pages/DonorsObjectPage",
	"donationmgmt/donors/test/integration/pages/DonationsObjectPage"
], function (JourneyRunner, DonorsList, DonorsObjectPage, DonationsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('donationmgmt/donors') + '/test/flpSandbox.html#donationmgmtdonors-tile',
        pages: {
			onTheDonorsList: DonorsList,
			onTheDonorsObjectPage: DonorsObjectPage,
			onTheDonationsObjectPage: DonationsObjectPage
        },
        async: true
    });

    return runner;
});

