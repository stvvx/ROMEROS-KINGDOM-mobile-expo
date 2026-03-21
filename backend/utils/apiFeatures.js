product = require("../models/product");
class APIFeatures {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;
    }
    // http://localhost:2173?keyword=apple&price[]
    // http://localhost:4001/api/v1/products?page=1&keyword=apple&price[lte]=1000&price[gte]=10
    search() {
        const keyword = this.queryStr.keyword ? {
            name: {
                $regex: this.queryStr.keyword,
                $options: 'i'
            }
        } : {}
        console.log(this.query, this.queryStr);
        this.query = this.query.find({ ...keyword });
        return this;
    }

    filter() {
        // { 'price[gte]': '100', 'price[lte]': '1000' }
        const queryCopy = { ...this.queryStr };
        // console.log(queryCopy);
        // Removing fields from the query
        const removeFields = ['keyword',  'page']
        removeFields.forEach(el => delete queryCopy[el]);

        let priceFilter = {};
        if (queryCopy['price[gte]'] || queryCopy['price[lte]']) {
            priceFilter.price = {};
            if (queryCopy['price[gte]']) {
                priceFilter.price.$gte = Number(queryCopy['price[gte]']);
            }
            if (queryCopy['price[lte]']) {
                priceFilter.price.$lte = Number(queryCopy['price[lte]']);
            }
            delete queryCopy['price[gte]'];
            delete queryCopy['price[lte]'];
        }

        // Normalize category filter:
        // - ignore 'All'
        // - support combined token "<id>|||<name>" so both legacy (name) and newer (id) data match
        if (typeof queryCopy.category === 'string') {
            const parts = queryCopy.category
                .split('|||')
                .map((v) => String(v).trim())
                .filter((v) => v && v.toLowerCase() !== 'all');

            if (parts.length === 0) {
                delete queryCopy.category;
            } else if (parts.length === 1) {
                queryCopy.category = parts[0];
            } else {
                queryCopy.category = { $in: Array.from(new Set(parts)) };
            }
        }

        console.log(queryCopy);

        // Apply remaining filters (e.g. category) along with the price filter
        this.query = this.query.find({ ...queryCopy, ...priceFilter });
        return this;
    }

    pagination(resPerPage) {
        const currentPage = Number(this.queryStr.page) || 1;
        const skip = resPerPage * (currentPage - 1);

        this.query = this.query.limit(resPerPage).skip(skip);
        return this;
    }
}
module.exports = APIFeatures