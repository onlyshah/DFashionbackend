module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Reward', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    points: { type: DataTypes.INTEGER, defaultValue: 0 },
    description: { type: DataTypes.TEXT },
    type: { type: DataTypes.ENUM('purchase', 'referral', 'review', 'social', 'milestone'), defaultValue: 'purchase' },
    reference: { type: DataTypes.JSON },
    expiresAt: { type: DataTypes.DATE },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'rewards', timestamps: true });
};
