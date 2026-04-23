module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Brand', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    logoUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'logo_url' }
  }, { tableName: 'brands', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
