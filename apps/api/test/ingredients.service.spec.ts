import { IngredientsService } from '../src/ingredients/ingredients.service';

describe('IngredientsService', () => {
  const makeIngredientRepository = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  });

  const makePriceRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const makeQueryBuilder = () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    };

    return qb;
  };

  it('updates price when ingredient, date and location already exist', async () => {
    const ingredientRepository = makeIngredientRepository();
    const ingredientPriceRepository = makePriceRepository();
    const queryBuilder = makeQueryBuilder();

    ingredientRepository.findOne.mockResolvedValue({
      id: 'ing-1',
      name: 'Sorgo rolado',
    });

    const existingPrice = {
      id: 'price-1',
      priceMxnPerKgAsFed: 5.8,
      effectiveDate: '2026-03-01',
      locationCode: 'MX-NL',
    };

    queryBuilder.getOne.mockResolvedValue(existingPrice);
    ingredientPriceRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    ingredientPriceRepository.save.mockImplementation(async (payload: unknown) => payload);

    const service = new IngredientsService(
      ingredientRepository as never,
      ingredientPriceRepository as never,
    );

    const result = await service.createPrice('ing-1', {
      priceMxnPerKgAsFed: 6.25,
      effectiveDate: '2026-03-01',
      locationCode: 'MX-NL',
    });

    expect(result).toMatchObject({
      id: 'price-1',
      priceMxnPerKgAsFed: 6.25,
      effectiveDate: '2026-03-01',
      locationCode: 'MX-NL',
    });
    expect(ingredientPriceRepository.create).not.toHaveBeenCalled();
    expect(ingredientPriceRepository.save).toHaveBeenCalledTimes(1);
  });

  it('creates a new price row when no existing row matches', async () => {
    const ingredientRepository = makeIngredientRepository();
    const ingredientPriceRepository = makePriceRepository();
    const queryBuilder = makeQueryBuilder();

    const ingredient = {
      id: 'ing-2',
      name: 'Maiz molido',
    };

    ingredientRepository.findOne.mockResolvedValue(ingredient);
    queryBuilder.getOne.mockResolvedValue(null);
    ingredientPriceRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    ingredientPriceRepository.create.mockImplementation((payload: unknown) => payload);
    ingredientPriceRepository.save.mockImplementation(async (payload: unknown) => payload);

    const service = new IngredientsService(
      ingredientRepository as never,
      ingredientPriceRepository as never,
    );

    const result = await service.createPrice('ing-2', {
      priceMxnPerKgAsFed: 7.1,
      effectiveDate: '2026-03-01',
      locationCode: 'MX-NL',
    });

    expect(ingredientPriceRepository.create).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      priceMxnPerKgAsFed: 7.1,
      effectiveDate: '2026-03-01',
      locationCode: 'MX-NL',
      ingredient,
    });
  });

  it('lists prices ordered by date and created timestamp', async () => {
    const ingredientRepository = makeIngredientRepository();
    const ingredientPriceRepository = makePriceRepository();
    const queryBuilder = makeQueryBuilder();

    ingredientRepository.findOne.mockResolvedValue({
      id: 'ing-3',
      name: 'Pasta de soya',
    });
    queryBuilder.getMany.mockResolvedValue([]);
    ingredientPriceRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const service = new IngredientsService(
      ingredientRepository as never,
      ingredientPriceRepository as never,
    );

    await service.listPrices('ing-3');

    expect(queryBuilder.where).toHaveBeenCalledWith('price.ingredient_id = :ingredientId', {
      ingredientId: 'ing-3',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('price.created_at', 'DESC');
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('price.effective_date', 'DESC');
  });
});
