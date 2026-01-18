module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Supplier', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    name: { 
      type: DataTypes.STRING(200), 
      allowNull: false,
      unique: true
    },
    email: { 
      type: DataTypes.STRING(150), 
      allowNull: false,
      validate: { isEmail: true }
    },
    phone: { 
      type: DataTypes.STRING(20), 
      allowNull: false 
    },
    address: { 
      type: DataTypes.TEXT 
    },
    city: { 
      type: DataTypes.STRING(100) 
    },
    state: { 
      type: DataTypes.STRING(100) 
    },
    zipCode: { 
      type: DataTypes.STRING(20) 
    },
    country: { 
      type: DataTypes.STRING(100) 
    },
    contactPerson: { 
      type: DataTypes.STRING(150) 
    },
    website: { 
      type: DataTypes.STRING(255) 
    },
    companyRegistration: { 
      type: DataTypes.STRING(100) 
    },
    taxId: { 
      type: DataTypes.STRING(50) 
    },
    paymentTerms: { 
      type: DataTypes.STRING(255),
      comment: 'e.g., Net 30, Net 60, COD'
    },
    minimumOrderQuantity: { 
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    leadTime: { 
      type: DataTypes.INTEGER,
      comment: 'Lead time in days'
    },
    status: { 
      type: DataTypes.ENUM('active', 'inactive', 'pending'),
      defaultValue: 'active'
    },
    rating: { 
      type: DataTypes.DECIMAL(3, 2),
      comment: 'Rating out of 5'
    },
    notes: { 
      type: DataTypes.TEXT 
    },
    createdAt: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    },
    updatedAt: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  }, { 
    tableName: 'suppliers',
    timestamps: true
  });
};
