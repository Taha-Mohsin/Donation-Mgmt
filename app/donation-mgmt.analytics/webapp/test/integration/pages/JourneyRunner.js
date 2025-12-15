sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"donationmgmt/analytics/test/integration/pages/AnalyticsList",
	"donationmgmt/analytics/test/integration/pages/AnalyticsObjectPage"
], function (JourneyRunner, AnalyticsList, AnalyticsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('donationmgmt/analytics') + '/test/flpSandbox.html#donationmgmtanalytics-tile',
        pages: {
			onTheAnalyticsList: AnalyticsList,
			onTheAnalyticsObjectPage: AnalyticsObjectPage
        },
        async: true
    });

    return runner;
});

