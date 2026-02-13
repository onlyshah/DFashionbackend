module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProductShare', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    productId: { type: DataTypes.UUID, allowNull: false },
    sharedBy: { type: DataTypes.UUID },
    sharedWith: { type: DataTypes.JSON, defaultValue: [] },
    platform: { type: DataTypes.ENUM('facebook', 'twitter', 'instagram', 'whatsapp', 'email'), defaultValue: 'email' },
    sharedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'product_shares', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
