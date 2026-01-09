module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER },
    action: { type: DataTypes.STRING(100), allowNull: false },
    module: { type: DataTypes.STRING(100) },
    description: { type: DataTypes.TEXT },
    oldValue: { type: DataTypes.JSON },
    newValue: { type: DataTypes.JSON },
    ipAddress: { type: DataTypes.STRING(50) }
  }, { tableName: 'audit_logs', timestamps: true });
};
