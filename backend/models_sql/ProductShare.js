module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProductShare', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    sharedBy: { type: DataTypes.INTEGER },
    sharedWith: { type: DataTypes.JSON, defaultValue: [] },
    platform: { type: DataTypes.ENUM('facebook', 'twitter', 'instagram', 'whatsapp', 'email'), defaultValue: 'email' },
    sharedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'product_shares', timestamps: true });
};
