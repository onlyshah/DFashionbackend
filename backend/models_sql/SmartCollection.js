module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SmartCollection', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(200), allowNull: false },
    slug: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    conditions: { type: DataTypes.JSON, defaultValue: {} },
    sortBy: { type: DataTypes.STRING(100), defaultValue: 'created_at' },
    sortOrder: { type: DataTypes.ENUM('asc', 'desc'), defaultValue: 'desc' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    isPublished: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, { tableName: 'smart_collections', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
