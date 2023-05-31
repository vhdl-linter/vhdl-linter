entity test_next is
end test_next;

architecture arch of test_next is

begin
  a_p : process

  begin
    a : for i_unused in 0 to 10 loop
      next b; -- wrong label
    end loop;
  end process;

end architecture;
