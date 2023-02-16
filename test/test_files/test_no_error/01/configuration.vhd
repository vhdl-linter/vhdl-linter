-- regression test to verify that files with only configurations are not empty (#270)
configuration dut_cfg of dut is
	for rtl
	end for;
end configuration;