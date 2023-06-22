library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_completion is
  generic (
    peach: integer
  );
  port (
    banana: integer
  );

end test_completion;

architecture arch of test_completion is
  signal a : std_logic;
  signal b : u_un;
begin
  inst_test_completion : entity work.dummy_entity
    port map(
      test
      );

  ban <= pea;
end arch;


entity dummy_entity is
  port (
    test_port : in integer
    );
end entity;