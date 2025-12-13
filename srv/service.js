const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
    const { Donations, Donors } = this.entities;

    // Auto-populate donor fields when donor is selected
    this.before(['CREATE', 'UPDATE'], 'Donations', async (req) => {
        const donation = req.data;
        
        // If a donor is selected, populate the denormalized fields
        if (donation.donor_ID) {
            const donor = await SELECT.one.from(Donors).where({ ID: donation.donor_ID });
            
            if (donor) {
                donation.donorName = donor.name;
                donation.donorEmail = donor.email;
                donation.donorPhone = donor.phone;
            }
        }
    });

    // Validate donation amount
    this.before(['CREATE', 'UPDATE'], 'Donations', async (req) => {
        if (req.data.amount && req.data.amount <= 0) {
            req.error(400, 'Donation amount must be greater than zero');
        }
    });
});