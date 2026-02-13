module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProductComment', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    productId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: false }
  }, { tableName: 'product_comments', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
