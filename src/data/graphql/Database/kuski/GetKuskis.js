import { Kuski } from 'data/models'; // import the data model

export const schema = [
  `
  # A user stored in the database
  type DatabaseKuski {
    KuskiIndex: Int
    Kuski: String
    TeamIndex: Int
    Country: String
    Password: String
    Rights: Int
    BmpCRC: Int
    BmpData: String
    RPlay: Int
    RStartBattle: Int
    RSpecialBattle: Int
    RStartCup: Int
    RStart24htt: Int
    RStop: Int
    RMultiPlay: Int
    RChat: Int
    RBan: Int
    RMod: Int
    RAdmin: Int
    Confirmed: Int
  }
`,
];

export const queries = [
  `
  # Retrieves all kuskis stored in the database
  getKuskis: [DatabaseKuski]

  # Retrieves a single kuski from the database from id
  getKuski(
    # The level's id
    KuskiIndex: Int!
  ): DatabaseKuski

  # Retrieves a single kuski ud from the database from name
  getKuskiId(
    # The kuski's name
    Name: String!
  ): DatabaseKuski
`,
];

const attributes = [
  'KuskiIndex',
  'Kuski',
  'TeamIndex',
  'Country',
  'RPlay',
  'RStartBattle',
  'RSpecialBattle',
  'RStartCup',
  'RStart24htt',
  'RStop',
  'RMultiPlay',
  'RChat',
  'RBan',
  'RMod',
  'RAdmin',
  'Confirmed',
];

export const resolvers = {
  RootQuery: {
    async getKuskis() {
      const kuskis = await Kuski.findAll({
        attributes,
        limit: 100,
        order: [['KuskiIndex', 'ASC']],
      });
      return kuskis;
    },
    async getKuski(parent, { KuskiIndex }) {
      const kuski = await Kuski.findOne({
        attributes,
        where: { KuskiIndex },
      });
      return kuski;
    },
    async getKuskiId(parent, { Name }) {
      const kuski = await Kuski.findOne({
        attributes,
        where: { Kuski: Name },
      });
      return kuski;
    },
  },
};
