module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AuditLog', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    actorUserId: { type: DataTypes.UUID, field: 'actor_user_id' },
    action: { type: DataTypes.STRING(100), allowNull: false },
    resourceType: { type: DataTypes.STRING(50), field: 'resource_type' },
    resourceId: { type: DataTypes.UUID, field: 'resource_id' },
    oldValues: { type: DataTypes.JSONB, field: 'old_values' },
    newValues: { type: DataTypes.JSONB, field: 'new_values' },
    ipAddress: { type: DataTypes.STRING(45), field: 'ip_address' },
    userAgent: { type: DataTypes.TEXT, field: 'user_agent' }
  }, { tableName: 'audit_logs', timestamps: false, underscored: true });
};
