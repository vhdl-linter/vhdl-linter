library ieee;
use ieee.std_logic_1164.all;
entity dummy_array is
  port (
    test : out std_ulogic_vector(0 downto 0)
    );
end entity;
library ieee;
use ieee.std_logic_1164.all;
entity test_formal_array is
end entity;
architecture arch of test_formal_array is
  signal test_signal : std_ulogic;
begin
  dummy_array : entity work.dummy_array
    port map (
      test(0) => test_signal
      );

end architecture;
