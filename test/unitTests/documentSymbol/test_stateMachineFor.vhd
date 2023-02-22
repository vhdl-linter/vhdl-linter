library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_else_generate is
end test_else_generate;

architecture arch of test_else_generate is
  type t_state is (idle, working, workingHard, waiting);
  signal state : t_state := idle;
begin

  p_reg : process(all)
  begin
    for i in 0 to 3 loop
      case state is
        when idle =>
          state <= working;
        when working|workingHard =>
          state <= waiting;
        when waiting =>
          state <= idle;
        when others =>
          state <= workingHard;
      end case;
    end loop;
  end process;

end arch;
