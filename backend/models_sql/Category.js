module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Category', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(200), allowNull: true }
  }, { tableName: 'categories', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
