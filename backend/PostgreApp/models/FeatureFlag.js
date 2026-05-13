module.exports = (sequelize, DataTypes) => {
  return sequelize.define('FeatureFlag', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    rolloutPercentage: { type: DataTypes.INTEGER, defaultValue: 0 },
    environment: { type: DataTypes.ENUM('development', 'staging', 'production'), defaultValue: 'development' }
  }, { tableName: 'feature_flags', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
