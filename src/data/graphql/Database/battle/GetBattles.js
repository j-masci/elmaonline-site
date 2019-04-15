import { Battle, Kuski, Battletime, Level, Team } from 'data/models'; // import the data model
import sequelize from 'sequelize';

// table schema documentation used by graphql,
// basically simplified version of what's in the data model,
// see data types here: http://graphql.org/learn/schema/#scalar-types
export const schema = [
  `
  # A battle stored in the database
  type DatabaseBattle {
    BattleIndex: Int
    KuskiIndex: Int
    LevelIndex: Int
    BattleType: String
    Started: String
    StartedUtc: Int
    Duration: Int
    Aborted: Int
    Finished: Int
    InQueue: Int
    Countdown: Int
    RecFileName: String
    KuskiData: DatabaseKuski
    Results: [DatabaseBattletime]
    LevelData: DatabaseLevel
  }

  type Pagination {
    rows: [DatabaseBattle]
    page: Int
    total: Int
  }
`,
];

// documentation of the queries made below, used by graphql
export const queries = [
  `
  # Retrieves all battles stored in the database
  getBattles: [DatabaseBattle]

  # Retrieves all battles between two dates
  getBattlesBetween(start: String, end: String): [DatabaseBattle]

  # Retrieves a single battle from the database
  getBattle(
    # The battle's id
    BattleIndex: Int!
  ): DatabaseBattle

  getBattlesByKuski(KuskiIndex: Int!, Page: Int!): Pagination
`,
];

const attributes = [
  'BattleIndex',
  'KuskiIndex',
  'LevelIndex',
  'BattleType',
  'Started',
  'StartedUtc',
  'Duration',
  'Aborted',
  'Finished',
  'InQueue',
  'Countdown',
  'RecFileName',
];

// database queries are called resolvers
// here you build the actual queries using the sequelize functions
// see more on querying here: http://docs.sequelizejs.com/manual/tutorial/querying.html
export const resolvers = {
  RootQuery: {
    async getBattles() {
      const battles = await Battle.findAll({
        attributes,
        limit: 100,
        include: [
          {
            model: Kuski,
            attributes: ['Kuski', 'Country'],
            as: 'KuskiData',
            include: [
              {
                model: Team,
                as: 'TeamData',
              },
            ],
          },
        ],
        order: [['BattleIndex', 'DESC']],
      });
      return battles;
    },
    async getBattlesByKuski(parent, { KuskiIndex, Page }) {
      const battles = await Battletime.findAndCountAll({
        attributes: ['BattleIndex'],
        limit: 25,
        offset: Page * 25,
        include: [
          {
            model: Kuski,
            attributes: ['Kuski', 'Country'],
            as: 'KuskiData',
            include: [
              {
                model: Team,
                as: 'TeamData',
              },
            ],
          },
        ],
        where: {
          KuskiIndex,
        },
        order: [['BattleIndex', 'DESC']],
      }).then(async qb => {
        const results = await Battletime.findAll({
          where: {
            BattleIndex: {
              [sequelize.Op.in]: qb.rows.map(r => r.BattleIndex),
            },
          },
          include: [
            {
              model: Kuski,
              attributes: ['Kuski', 'Country'],
              as: 'KuskiData',
              include: [
                {
                  model: Team,
                  as: 'TeamData',
                },
              ],
            },
          ],
        });
        const battleData = await Battle.findAll({
          attributes: [
            'BattleIndex',
            'BattleType',
            'KuskiIndex',
            'LevelIndex',
            'Started',
            'Duration',
          ],
          where: {
            BattleIndex: {
              [sequelize.Op.in]: qb.rows.map(r => r.BattleIndex),
            },
          },
          include: [
            {
              model: Kuski,
              attributes: ['Kuski', 'Country'],
              as: 'KuskiData',
              include: [
                {
                  model: Team,
                  as: 'TeamData',
                },
              ],
            },
            {
              model: Level,
              attributes: ['LevelName'],
              as: 'LevelData',
            },
          ],
          order: [['BattleIndex', 'DESC']],
        });
        return {
          total: qb.count,
          page: Page,
          rows: battleData.map(b => {
            // eslint-disable-next-line
            b.Results = results.filter(r => r.BattleIndex === b.BattleIndex);
            return b;
          }),
        };
      });
      return battles;
    },
    async getBattlesBetween(parent, { start, end }) {
      const battles = await Battle.findAll({
        attributes: [
          'BattleIndex',
          'KuskiIndex',
          'LevelIndex',
          'Started',
          'Duration',
          'BattleType',
          'InQueue',
          'Finished',
        ],
        limit: 100,
        include: [
          {
            model: Kuski,
            attributes: ['Kuski', 'Country'],
            as: 'KuskiData',
            include: [
              {
                model: Team,
                as: 'TeamData',
              },
            ],
          },
          {
            model: Level,
            attributes: ['LevelName'],
            as: 'LevelData',
          },
          {
            model: Battletime,
            as: 'Results',
            include: [
              {
                model: Kuski,
                attributes: ['Kuski', 'Country'],
                as: 'KuskiData',
                include: [
                  {
                    model: Team,
                    as: 'TeamData',
                  },
                ],
              },
            ],
          },
        ],
        order: [['Started', 'DESC']],
        where: {
          Started: {
            [sequelize.Op.between]: [start, end],
          },
        },
      });
      return battles;
    },
    async getBattle(parent, { BattleIndex }) {
      const battle = await Battle.findOne({
        attributes: [
          'BattleIndex',
          'KuskiIndex',
          'LevelIndex',
          'Started',
          'BattleType',
          'Duration',
        ],
        where: { BattleIndex, Finished: 1 },
        include: [
          {
            model: Kuski,
            attributes: ['Kuski', 'Country'],
            as: 'KuskiData',
            include: [
              {
                model: Team,
                as: 'TeamData',
              },
            ],
          },
          {
            model: Level,
            attributes: ['LevelName'],
            as: 'LevelData',
          },
          {
            model: Battletime,
            as: 'Results',
            include: [
              {
                model: Kuski,
                attributes: ['Kuski', 'Country'],
                as: 'KuskiData',
                include: [
                  {
                    model: Team,
                    as: 'TeamData',
                  },
                ],
              },
            ],
          },
        ],
      });
      return battle;
    },
  },
};