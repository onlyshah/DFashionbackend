const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Address = sequelize.define(
    'Address',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      type: {
        type: DataTypes.ENUM('billing', 'shipping', 'both'),
        defaultValue: 'both',
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      street: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      buildingName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      zipCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING(100),
        defaultValue: 'India',
        allowNull: false,
      },
      landmark: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'Addresses',
      timestamps: true,
      indexes: [
        {
          fields: ['userId'],
        },
        {
          fields: ['userId', 'isDefault'],
        },
      ],
    }
  );

  // Association
  Address.associate = (models) => {
    if (models.User) {
      Address.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  };

  return Address;
};
