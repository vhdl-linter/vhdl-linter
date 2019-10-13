library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity yolo1234 is
  port (
    o_Clock : out std_logic;
    i_reset : in  std_logic
    );
end yolo1234;

architecture behave of yolo1234 is

  signal r_Shift_With_For : std_logic_vector(3 downto 0) := X"1";
  signal r_Shift_Regular  : std_logic_vector(3 downto 0) := X"1";
  signal a                : std_logic;
begin

  -- Performs a shift left using regular assignments
  p_Shift_Without_For : process (i_Clock)
  begin
    if rising_edge(i_Clock) then
      r_Shift_Regular(1) <= r_Shift_Regular(0);
      r_Shift_Regular(2) <= r_Shift_Regular(1);
      r_Shift_Regular(3) <= r_Shift_Regular(2);
      r_Shift_With_For   <= (others => '0');
      case yolo is

        when IDLE =>


        when others =>

      end case;  -- end case
    end if;
  end process;

  yolo : entity work.yolo
  port map(
  a => a
  );


end behave;
