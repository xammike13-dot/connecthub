import test from 'node:test';
import assert from 'node:assert/strict';
import Product from '../models/Product.js';
import Rental from '../models/Rental.js';
import { getProduct, getRelatedProducts } from '../controllers/productController.js';
import { getRental } from '../controllers/rentalController.js';

test('Product and Rental Controller Unit Tests', async (t) => {
  await t.test('getProduct retrieves product with populated business and returns 200', async () => {
    const originalFindById = Product.findById;
    const mockProduct = {
      _id: '654321654321654321654321',
      name: 'Test Product',
      price: 1500,
      description: 'Test description',
      category: 'Electronics',
      variations: [{ name: 'Size', options: ['S', 'M'] }],
      addOns: [{ name: 'Extra Cable', price: 100 }],
      business: {
        _id: '123456123456123456123456',
        name: 'Tech Store Owner',
        businessProfile: {
          businessName: 'Tech Hub Store',
          campusLocation: 'Stage',
        },
      },
    };

    Product.findById = (id) => ({
      populate: (field, select) => Promise.resolve(mockProduct),
    });

    try {
      let statusCode = null;
      let responseBody = null;
      const req = { params: { productId: '654321654321654321654321' } };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        },
      };

      await getProduct(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.data.name, 'Test Product');
      assert.equal(responseBody.data.business.businessProfile.businessName, 'Tech Hub Store');
    } finally {
      Product.findById = originalFindById;
    }
  });

  await t.test('getRelatedProducts calculates pagination metadata and excludes current product', async () => {
    const originalFindById = Product.findById;
    const originalCountDocuments = Product.countDocuments;
    const originalAggregate = Product.aggregate;
    const originalFind = Product.find;

    const mockCurrentProduct = {
      _id: '654321654321654321654321',
      category: 'Footwear',
      categorySlug: 'footwear',
      subcategory: 'Sneakers',
      brand: 'Nike',
      price: 3000,
    };

    const mockRelatedCatItems = [
      { _id: '111111111111111111111111', name: 'Sneaker A', category: 'Footwear', price: 3200 },
      { _id: '222222222222222222222222', name: 'Sneaker B', category: 'Footwear', price: 2900 },
    ];

    Product.findById = () => ({
      select: () => Promise.resolve(mockCurrentProduct),
    });

    let countCall = 0;
    Product.countDocuments = (query) => {
      countCall++;
      // First call is category count, second is fallback count
      if (countCall === 1) return Promise.resolve(2);
      return Promise.resolve(5);
    };

    Product.aggregate = (pipeline) => Promise.resolve(mockRelatedCatItems);

    Product.find = (query) => ({
      populate: () => ({
        lean: () => Promise.resolve(mockRelatedCatItems.map(p => ({
          ...p,
          business: { name: 'Shoe Shop' },
        }))),
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    });

    try {
      let statusCode = null;
      let responseBody = null;
      const req = {
        params: { productId: mockCurrentProduct._id },
        query: { page: '1', limit: '10' },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        },
      };

      await getRelatedProducts(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.data.length, 2);
      assert.equal(responseBody.pagination.currentPage, 1);
      assert.equal(responseBody.pagination.perPage, 10);
      assert.equal(responseBody.pagination.total, 7); // 2 category + 5 fallback
      assert.equal(responseBody.pagination.hasMore, true);
      assert.equal(responseBody.pagination.nextPage, 2);
    } finally {
      Product.findById = originalFindById;
      Product.countDocuments = originalCountDocuments;
      Product.aggregate = originalAggregate;
      Product.find = originalFind;
    }
  });

  await t.test('getRental returns rental with populated landlord and rentalPeriod', async () => {
    const originalFindById = Rental.findById;

    const mockRental = {
      _id: '777777777777777777777777',
      rentalName: 'Sunset Bedsitter',
      rentalType: 'bedsitter',
      monthlyPrice: 5000,
      rentalPeriod: 'month',
      location: 'stage',
      amenities: ['wifi', 'security'],
      description: 'Cozy bedsitter near stage',
      images: ['https://example.com/bed.jpg'],
      isAvailable: true,
      views: 20,
      favoritesCount: 5,
      landlord: {
        _id: '888888888888888888888888',
        name: 'Landlord Jane',
        avatar: 'https://example.com/avatar.jpg',
        landlordProfile: {
          propertyName: 'Sunset Villas',
        },
      },
      toObject() {
        return { ...this };
      },
    };

    Rental.findById = () => ({
      populate: () => ({
        populate: () => Promise.resolve(mockRental),
      }),
    });

    try {
      let statusCode = null;
      let responseBody = null;
      const req = {
        params: { rentalId: mockRental._id },
        user: null,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        },
      };

      await getRental(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.data.rentalName, 'Sunset Bedsitter');
      assert.equal(responseBody.data.monthlyPrice, 5000);
      assert.equal(responseBody.data.rentalPeriod, 'month');
      assert.equal(responseBody.data.landlord.name, 'Landlord Jane');
    } finally {
      Rental.findById = originalFindById;
    }
  });
});
