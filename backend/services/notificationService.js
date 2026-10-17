const Notification = require('../models/Notification');

// recipientModel: 'Admin' | 'Intern'
exports.notify = async ({ recipient, recipientModel, type, title, message, link }) => {
  try {
    return await Notification.create({ recipient, recipientModel, type, title, message, link });
  } catch (err) {
    console.error('Notification failed:', err.message);
    return null;
  }
};

exports.notifyMany = async (recipients, recipientModel, payload) => {
  try {
    const docs = recipients.map((recipient) => ({ ...payload, recipient, recipientModel }));
    if (docs.length) await Notification.insertMany(docs);
  } catch (err) {
    console.error('Bulk notification failed:', err.message);
  }
};
