const Activity = require('../models/Activity');

// Fire-and-forget: logging must never break the main request.
exports.logActivity = async ({ actor, action, entityType, entityId, intern, description, metadata }) => {
  try {
    return await Activity.create({
      actor: actor._id,
      actorModel: actor.role === 'admin' ? 'Admin' : 'Intern',
      actorName: actor.name,
      action,
      entityType,
      entityId,
      intern,
      description,
      metadata,
    });
  } catch (err) {
    console.error('Activity log failed:', err.message);
    return null;
  }
};
