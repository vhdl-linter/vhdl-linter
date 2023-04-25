library ieee;
use ieee.std_logic_1164.all;
entity test_verilog_instance is
end entity;
architecture arch of test_verilog_instance is
  signal in_bit     : std_ulogic;
  signal out_bit    : std_ulogic;
  signal in_bit_2   : std_ulogic;
  signal out_bit_2  : std_ulogic;
  signal out_byte_2 : std_ulogic_vector(8 - 1 downto 0);
  signal in_byte_2  : std_ulogic_vector(8 - 1 downto 0);
begin
  inst_test_module : entity work.test_module
    port map (
      in_bit     => in_bit,
      out_bit    => out_bit,
      in_bit_2   => in_bit_2,
      out_bit_2  => out_bit_2,
      out_byte_2 => out_byte_2,
      in_byte_2  => in_byte_2);
  process
  begin
  in_bit    <= 0;
  in_bit_2  <= 0;
  in_byte_2 <= (others => '0');
  report to_hex_string(out_bit & out_bit_2 & out_byte_2);
  end process;

end architecture;
library ieee;
use ieee.std_logic_1164.all;
entity test_verilog_instance2 is
end entity;
architecture arch of test_verilog_instance2 is
  signal in_bit     : std_ulogic;
  signal out_bit    : std_ulogic;
  signal in_bit_2   : std_ulogic;
  signal out_bit_2  : std_ulogic;
  signal out_byte_2 : std_ulogic_vector(8 - 1 downto 0);
  signal in_byte_2  : std_ulogic_vector(8 - 1 downto 0);
begin
  inst_test_module2 : entity work.test_module2
    port map (
      in_bit     => in_bit,
      out_bit    => out_bit,
      in_bit_2   => in_bit_2,
      out_bit_2  => out_bit_2,
      out_byte_2 => out_byte_2,
      in_byte_2  => in_byte_2);
 process
  begin
  in_bit    <= 0;
  in_bit_2  <= 0;
  in_byte_2 <= (others => '0');
  report to_hex_string(out_bit & out_bit_2 & out_byte_2);
  end process;
end architecture;
