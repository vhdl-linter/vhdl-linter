library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity ent is
  port (
    i_c  : in  std_ulogic;
    o_c : out std_ulogic
    );
end ent;

architecture arch of ent is
  type cap is range -1E18 to 1E18
    units
      fF;
      pF = 1000 fF;
      nF = 1000 pF;
      uF = 1000 nF;
      mF = 1000 uF;
    end units;

-- Examples from 6.7
  type COORDINATE is record X, Y : integer; end record;
  subtype positive is integer range 1 to integer'high;
  attribute LOCATION             : COORDINATE;
  attribute PIN_NO               : positive;
  attribute CAPACITANCE          : cap;
-- Examples from 7.3
  attribute PIN_NO of i_c        : signal is 10;
  attribute PIN_NO of o_c       : signal is 5;
  attribute LOCATION of ADDER1   : label is (10, 15);
  attribute LOCATION of others   : label is (25, 77);
  attribute CAPACITANCE of all   : signal is 15 pF;


--   -- TODO: Fix parsing of groups
--   attribute IMPLEMENTATION of G1 : group is "74LS152";
--   attribute RISING_DELAY of C2Q  : group is 7.2 ns;

-- -- Examples from 6.6
--   group G1: RESOURCE (L1, L2); -- A group of two labels.
--   group C2Q: PIN2PIN (PROJECT.GLOBALS.CK, Q);
-- -- Groups may associate named
-- -- entities in different declarative
-- -- parts (and regions).
begin
  o_c <= '0';
  ADDER1 : entity work.adder;
end architecture;

entity adder is
end entity;
